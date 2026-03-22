FROM node:24-bookworm-slim

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    chromium \
    imagemagick \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/g' /etc/ImageMagick-6/policy.xml || true

COPY package*.json pnpm-lock.yaml* ./
COPY prisma ./prisma

# Install pnpm globally
RUN npm install -g pnpm @nestjs/cli

RUN pnpm install --frozen-lockfile

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY . .

RUN pnpm exec prisma generate


COPY docker-entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT [ "docker-entrypoint.sh" ]


EXPOSE 3000
EXPOSE 5555

CMD [ "pnpm", "run", "start:dev" ]
