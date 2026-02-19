# Prisma Multi-File Models

This directory contains individual Prisma model files. Each file represents a single database model.

## Structure

- `user.prisma` - User model
- `post.prisma` - Post model (WordPress-style)
- `vault.prisma` - VaultEntry model for encrypted credentials
- `log.prisma` - Log model

## How it works

1. Each model is defined in its own `.prisma` file in this directory
2. Run `npm run build:prisma` to combine all models into `../schema.prisma`
3. The generated `schema.prisma` is then used by Prisma CLI

## Commands

- `npm run build:prisma` - Combine model files into single schema.prisma
- `npm run prisma:generate` - Build schema and generate Prisma client
- `npm run prisma:migrate` - Build schema and run migrations

## Adding new models

1. Create a new `.prisma` file in this directory
2. Define your model using standard Prisma syntax
3. Run `npm run build:prisma` to regenerate the schema
4. The model will automatically be included in `schema.prisma`

## Note

Do NOT edit `../schema.prisma` directly as it will be overwritten when running the build script.
