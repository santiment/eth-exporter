CREATE TABLE IF NOT EXISTS events_stream (
  address String,
  blockHash String,
  blockNumber UInt64,
  data String,
  logIndex UInt64,
  removed UInt8,
  topics Array(String),
  transactionHash String,
  transactionIndex UInt64,
  transactionLogIndex String,
  type String,
  id String,
  primaryKey UInt64,
  timestamp UInt64,
  decoded String,
  name String
) ENGINE = Kafka(
  'kafka:9092',
  'eth_exporter_events',
  'eth_exporter_events_group',
  'JSONEachRow'
);

CREATE TABLE IF NOT EXISTS events (
  timestamp DateTime,
  address String,
  blockHash String,
  blockNumber UInt64,
  logIndex UInt64,
  removed UInt8,
  topics Array(String),
  transactionHash String,
  transactionIndex UInt64,
  transactionLogIndex String,
  type String,
  id String,
  primaryKey UInt64,
  decoded String,
  name String
) ENGINE = ReplacingMergeTree()
  ORDER BY (name, blockNumber, logIndex)
  PARTITION BY toYYYYMM(timestamp);

CREATE MATERIALIZED VIEW IF NOT EXISTS events_mv TO events
AS SELECT address,
  blockHash,
  blockNumber,
  logIndex,
  removed,
  topics,
  transactionHash,
  transactionIndex,
  transactionLogIndex,
  type,
  id,
  primaryKey,
  toDateTime(timestamp) as timestamp,
  decoded,
  name
FROM events_stream;