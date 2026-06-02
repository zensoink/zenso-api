import { Prisma } from '@prisma/client';

// eslint-disable-next-line no-restricted-syntax
const AS_PRISMA_JSON = <T>(value: T): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return AS_PRISMA_JSON(value);
}
