import type { Producer, Consumer, EachMessagePayload, Admin } from 'kafkajs';
import { Kafka } from 'kafkajs';

import { config } from '../../config/index.js';

import { logger } from './logger.js';

import type { KafkaMessage } from '@/types';

class KafkaService {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private admin: Admin | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    // Skip connection if Kafka is disabled
    if (!config.kafka.enabled) {
      logger.info('Kafka is disabled, skipping connection');
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        retry: {
          initialRetryTime: 300,
          retries: 8,
        },
      });

      this.producer = this.kafka.producer();
      this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
      this.admin = this.kafka.admin();

      await this.producer.connect();
      await this.consumer.connect();
      await this.admin.connect();

      this.isConnected = true;
      logger.info('Kafka connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Kafka:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.disconnect();
    }
    if (this.admin) {
      await this.admin.disconnect();
    }
    this.isConnected = false;
    logger.info('Kafka disconnected');
  }

  getProducer(): Producer {
    if (!config.kafka.enabled) {
      throw new Error('Kafka is disabled');
    }
    if (!this.producer || !this.isConnected) {
      throw new Error('Kafka producer not connected');
    }
    return this.producer;
  }

  getConsumer(): Consumer {
    if (!config.kafka.enabled) {
      throw new Error('Kafka is disabled');
    }
    if (!this.consumer || !this.isConnected) {
      throw new Error('Kafka consumer not connected');
    }
    return this.consumer;
  }

  getAdmin(): Admin {
    if (!config.kafka.enabled) {
      throw new Error('Kafka is disabled');
    }
    if (!this.admin || !this.isConnected) {
      throw new Error('Kafka admin not connected');
    }
    return this.admin;
  }

  async publish<T>(message: KafkaMessage<T>): Promise<void> {
    const producer = this.getProducer();
    try {
      await producer.send({
        topic: message.topic,
        messages: [
          {
            key: message.key,
            value: JSON.stringify(message.value),
            headers: message.headers,
          },
        ],
      });
      logger.debug('Message published to Kafka', { topic: message.topic });
    } catch (error) {
      logger.error('Failed to publish message to Kafka:', error);
      throw error;
    }
  }

  async subscribe(
    topic: string,
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    const consumer = this.getConsumer();
    try {
      await consumer.subscribe({ topic, fromBeginning: false });
      await consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            logger.error('Error processing Kafka message:', error);
          }
        },
      });
      logger.info(`Subscribed to Kafka topic: ${topic}`);
    } catch (error) {
      logger.error('Failed to subscribe to Kafka topic:', error);
      throw error;
    }
  }

  async createTopic(topic: string, numPartitions = 1): Promise<void> {
    const admin = this.getAdmin();
    try {
      const existingTopics = await admin.listTopics();
      if (!existingTopics.includes(topic)) {
        await admin.createTopics({
          topics: [{ topic, numPartitions }],
        });
        logger.info(`Kafka topic created: ${topic}`);
      }
    } catch (error) {
      logger.error('Failed to create Kafka topic:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    // If Kafka is disabled, consider it healthy (not required)
    if (!config.kafka.enabled) {
      return true;
    }

    try {
      const admin = this.getAdmin();
      await admin.listTopics();
      return true;
    } catch {
      return false;
    }
  }
}

export const kafkaService = new KafkaService();
