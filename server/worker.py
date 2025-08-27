import os
from redis import Redis
from rq import Worker, Queue

listen = ['default']
redis_url = os.getenv('REDIS_URL', 'redis://redis:6379')
redis_conn = Redis.from_url(redis_url)

if __name__ == '__main__':
    queues = [Queue(name, connection=redis_conn) for name in listen]
    worker = Worker(queues, connection=redis_conn)
    print(f"Worker started. Listening on queue: {listen[0]}")
    worker.work()