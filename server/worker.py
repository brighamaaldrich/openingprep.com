import os
from redis import Redis
from rq import Worker, Queue

listen = ['default']
redis_host = os.getenv("REDIS_HOST", "localhost")
redis_conn = Redis(host=redis_host, port=6379)

if __name__ == '__main__':
    queues = [Queue(name, connection=redis_conn) for name in listen]
    worker = Worker(queues, connection=redis_conn)
    print(f"Worker started. Listening on queue: {listen[0]}")
    worker.work()