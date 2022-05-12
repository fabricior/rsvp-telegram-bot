import express from "express";

export default function startHealthCheckServer() {
  const app = express();
  const port = process.env.PORT || 8080;

  app.get("/", (_, res) => {
    res.send({ status: "fully functional"});
  });

  const server = app.listen(port, () =>
    console.debug(`Health check endpoint listening on port ${port}!`)
  );

  process.on('SIGTERM', () => {
    console.debug('SIGTERM signal received: closing HTTP server')
    server.close(() => {
      console.debug('HTTP server closed')
    })
  })
}
