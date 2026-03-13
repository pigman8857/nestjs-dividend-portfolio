# How to integrate Grafana Alloy with NestJS

Grafana Alloy acts as an **OpenTelemetry collector pipeline** — NestJS emits telemetry (traces, metrics, logs), Alloy receives and forwards it to a backend (Grafana Cloud, Loki, Tempo, Prometheus, etc.).

## The integration path

```
NestJS (OTel SDK) → Alloy (OTLP receiver) → Backend (Grafana Cloud / local Grafana stack)
```

---

## 1. Instrument NestJS with OpenTelemetry

Install the SDK:

```bash
npm install @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/exporter-metrics-otlp-http
```

Create `src/instrumentation.ts` — **must be loaded before anything else**:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  serviceName: 'mongo-oracle',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://alloy:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://alloy:4318/v1/metrics',
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

Then in `src/main.ts`, import it as the very first line:

```ts
import './instrumentation';  // must be first
import { NestFactory } from '@nestjs/core';
// ...
```

---

## 2. Configure Alloy (`alloy/config.alloy`)

```alloy
// Receive OTLP from NestJS
otelcol.receiver.otlp "default" {
  grpc { endpoint = "0.0.0.0:4317" }
  http { endpoint = "0.0.0.0:4318" }

  output {
    traces  = [otelcol.exporter.otlp.grafana_cloud.input]
    metrics = [otelcol.exporter.otlp.grafana_cloud.input]
    logs    = [otelcol.exporter.otlp.grafana_cloud.input]
  }
}

// Forward to backend (swap URL/auth for your target)
otelcol.exporter.otlp "grafana_cloud" {
  client {
    endpoint = env("GRAFANA_OTLP_ENDPOINT")
    auth     = otelcol.auth.basic.grafana_cloud.handler
  }
}

otelcol.auth.basic "grafana_cloud" {
  username = env("GRAFANA_INSTANCE_ID")
  password = env("GRAFANA_API_KEY")
}
```

---

## 3. Expose Alloy's OTLP ports in docker-compose

Update the `alloy` service in `docker-compose.localhost.yml`:

```yaml
alloy:
  image: grafana/alloy:latest
  ports:
    - "12345:12345"   # Alloy UI
    - "4317:4317"     # OTLP gRPC
    - "4318:4318"     # OTLP HTTP
  volumes:
    - ./alloy/config.alloy:/etc/alloy/config.alloy
  command: run --server.http.listen-addr=0.0.0.0:12345 /etc/alloy/config.alloy
  depends_on:
    - app
```

---

## What you get automatically

`getNodeAutoInstrumentations()` instruments these without any extra code:

| Signal | What's captured |
|--------|----------------|
| Traces | HTTP requests, Mongoose queries, outbound HTTP |
| Metrics | HTTP request duration/count, Node.js runtime metrics |
| Logs | Console output correlated with trace IDs |
