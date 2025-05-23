FROM denoland/deno:1.37.0
WORKDIR /app
COPY . .
ENV PORT=8060
CMD ["run", "--allow-net", "--allow-read=.", "server.ts", "${PORT}"]
EXPOSE ${PORT}
