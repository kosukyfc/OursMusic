# Grafana Dashboards Setup

## Dashboard 1: Application Overview

### Gauge: Average Response Time
```json
{
  "targets": [
    {
      "expr": "avg(rate(http_request_duration_seconds_sum[5m])) / avg(rate(http_request_duration_seconds_count[5m]))"
    }
  ],
  "units": "s",
  "thresholds": "0.1,1"
}
```

### Graph: Request Rate
```json
{
  "targets": [
    {
      "expr": "sum(rate(http_requests_total[5m]))"
    }
  ],
  "legend": "Requests/sec"
}
```

### Graph: Error Rate
```json
{
  "targets": [
    {
      "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
    }
  ],
  "legend": "Error %"
}
```

## Dashboard 2: Database Performance

### Table: Query Performance
```json
{
  "targets": [
    {
      "expr": "topk(10, pg_stat_statements_mean_exec_time)",
      "format": "table"
    }
  ]
}
```

### Graph: Connection Count
```json
{
  "targets": [
    {
      "expr": "pg_stat_activity_count"
    }
  ],
  "legend": "Active connections"
}
```

## Dashboard 3: Cache Performance

### Gauge: Cache Hit Rate
```json
{
  "targets": [
    {
      "expr": "redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)"
    }
  ],
  "units": "percentunit",
  "thresholds": "0.7,0.85"
}
```

### Graph: Memory Usage
```json
{
  "targets": [
    {
      "expr": "redis_memory_used_bytes / redis_memory_max_bytes"
    }
  ],
  "legend": "% Memory"
}
```

## Dashboard 4: System Health

### CPU Usage
```json
{
  "targets": [
    {
      "expr": "(1 - avg(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])))"
    }
  ],
  "legend": "CPU %"
}
```

### Disk Space
```json
{
  "targets": [
    {
      "expr": "(node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100"
    }
  ],
  "legend": "% Free"
}
```

## Import Dashboards

1. Go to Grafana: http://localhost:3001
2. Dashboards → New → Import
3. Paste JSON or upload files

Sample dashboards available at:
- https://grafana.com/grafana/dashboards/3662
- https://grafana.com/grafana/dashboards/9628
