# nestMongoOracle

A NestJS application with production-first configuration and MongoDB integration via Mongoose.

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | v22 |
| npm | v10+ |
| MongoDB | v6+ |

---

## Key Dependencies

| Package | Version |
|---------|---------|
| `@nestjs/common` | ^11.0.1 |
| `@nestjs/core` | ^11.0.1 |
| `@nestjs/config` | ^4.0.3 |
| `@nestjs/mongoose` | ^11.0.4 |
| `mongoose` | ^9.3.0 |
| `joi` | ^18.0.2 |
| `typescript` | ^5.7.3 |

---

## Project Setup

```bash
npm install
```

---

## Configuration

The app uses a **production-first** config strategy:

- In **production** (`NODE_ENV=production`), env vars are read directly from the environment — no `.env` file is loaded.
- In **development/test**, a `.env` file is loaded from the project root.
- All required variables are validated with Joi on startup. The app **refuses to start** if any required variable is missing.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `PORT` | No | `3000` | HTTP port |
| `MONGO_URI` | Yes | — | Full MongoDB connection URI |
| `MONGO_DB_NAME` | Yes | — | MongoDB database name |

### Local Development Setup

Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=mongo_oracle
```

### Production Setup

Set environment variables directly on the host or in your container/orchestration platform. Do **not** use a `.env` file in production.

```bash
export NODE_ENV=production
export PORT=3000
export MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net
export MONGO_DB_NAME=mongo_oracle
```

### Adding New Config Values

1. Add the env var and Joi rule to `src/config/config.module.ts`:

```ts
validationSchema: Joi.object({
  // ...existing
  REDIS_URL: Joi.string().uri().required(),
})
```

2. If grouping under a namespace, create `src/config/redis.config.ts`:

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL,
}));
```

3. Register the factory in `ConfigModule`:

```ts
load: [mongoConfig, redisConfig],
```

4. Add a typed getter to `src/config/config.service.ts`:

```ts
get redis() {
  return this.config.getOrThrow('redis');
}
```

---

## Database Module

`DatabaseModule` establishes the Mongoose connection using values from `ConfigService`. It is registered once in `AppModule` and the connection is shared across the entire app.

### Using MongoDB in a Feature Module

**Step 1 — Define a schema** (`src/cats/cat.schema.ts`):

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema()
export class Cat {
  @Prop({ required: true })
  name: string;

  @Prop()
  age: number;
}

export type CatDocument = HydratedDocument<Cat>;
export const CatSchema = SchemaFactory.createForClass(Cat);
```

**Step 2 — Register the schema in the feature module** (`src/cats/cats.module.ts`):

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cat, CatSchema } from './cat.schema';
import { CatsService } from './cats.service';
import { CatsController } from './cats.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }]),
  ],
  providers: [CatsService],
  controllers: [CatsController],
})
export class CatsModule {}
```

**Step 3 — Inject the model in a service** (`src/cats/cats.service.ts`):

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cat, CatDocument } from './cat.schema';

@Injectable()
export class CatsService {
  constructor(
    @InjectModel(Cat.name) private readonly catModel: Model<CatDocument>,
  ) {}

  async findAll(): Promise<Cat[]> {
    return this.catModel.find().exec();
  }

  async create(name: string, age: number): Promise<Cat> {
    return this.catModel.create({ name, age });
  }
}
```

**Step 4 — Register the feature module in `AppModule`**:

```ts
@Module({
  imports: [ConfigModule, DatabaseModule, CatsModule],
})
export class AppModule {}
```

---

## Running the App

```bash
# development (watch mode)
npm run start:dev

# production
npm run build
npm run start:prod
```

---

## Docker

Each environment has its own Dockerfile and docker-compose file.

| Environment | Dockerfile | docker-compose |
|-------------|------------|----------------|
| Localhost | `Dockerfile.localhost` | `docker-compose.localhost.yml` |
| Development | `Dockerfile.dev` | `docker-compose.dev.yml` |
| Production | `Dockerfile.prod` | `docker-compose.prod.yml` |

### Localhost

Spins up the app and a MongoDB container together. The `src/` directory is mounted as a volume so code changes reflect immediately without rebuilding.

Requires a `.env` file in the project root (see [Local Development Setup](#local-development-setup)).

```bash
# Build image
docker build -f Dockerfile.localhost -t nest-mongo-oracle:localhost .

# Run with docker compose (recommended)
docker compose -f docker-compose.localhost.yml up

# Rebuild image and run
docker compose -f docker-compose.localhost.yml up --build

# Stop and remove containers
docker compose -f docker-compose.localhost.yml down
```

### Development

Code is baked into the image at build time — no volume mounts. Expects an external MongoDB, configured via `.env`.

Requires a `.env` file in the project root (see [Local Development Setup](#local-development-setup)).

```bash
# Build image
docker build -f Dockerfile.dev -t nest-mongo-oracle:dev .

# Run with docker compose
docker compose -f docker-compose.dev.yml up

# Rebuild image and run
docker compose -f docker-compose.dev.yml up --build

# Stop and remove containers
docker compose -f docker-compose.dev.yml down
```

### Production

Multi-stage build that produces a minimal image with only compiled output and production dependencies. Runs as a non-root user. No `.env` file — all variables must be provided via the host environment or CI/CD secrets.

```bash
# Build image
docker build -f Dockerfile.prod -t nest-mongo-oracle:prod .

# Run with docker compose
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net \
MONGO_DB_NAME=mongo_oracle \
docker compose -f docker-compose.prod.yml up

# Rebuild image and run
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net \
MONGO_DB_NAME=mongo_oracle \
docker compose -f docker-compose.prod.yml up --build

# Stop and remove containers
docker compose -f docker-compose.prod.yml down
```

---

## Running Tests

```bash
# unit tests
npm run test

# test coverage
npm run test:cov

# e2e tests
npm run test:e2e
```
