FROM public.ecr.aws/lambda/nodejs:22 AS builder
WORKDIR /usr/app
COPY .  ./
RUN npm ci
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:22
COPY --from=builder /usr/app/dist/* ./
CMD ["index.handler"]
