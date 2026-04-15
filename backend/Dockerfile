FROM public.ecr.aws/lambda/nodejs:22 AS builder
WORKDIR /usr/app
COPY .  .
RUN npm install
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:22
COPY --from=builder /usr/app/dist/* ${LAMBDA_TASK_ROOT}
CMD ["index.handler"]
