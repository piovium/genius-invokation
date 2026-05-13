import type { PrismaConfig } from "prisma/config";

export default {
  datasource: {
    url: process.env.DATABASE_URL!,
  },
} satisfies PrismaConfig;
