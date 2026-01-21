FROM node:24-alpine3.22

WORKDIR /usr/src/app

RUN apk add --no-cache netcat-openbsd xdg-utils

COPY package*.json pnpm-lock.yaml* ./
COPY prisma ./prisma

# Install pnpm globally
RUN npm install -g pnpm @nestjs/cli

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate


COPY docker-entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT [ "docker-entrypoint.sh" ]


EXPOSE 3000
EXPOSE 5555

CMD [ "pnpm", "run", "start:dev" ]
