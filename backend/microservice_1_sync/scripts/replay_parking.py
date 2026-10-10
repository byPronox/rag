import argparse
import json

import pika

from config.settings import Config

RESET_HEADERS = ("x-error", "x-retry-count", "x-infra-retry-count")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Replay messages from the parking queue.")
    parser.add_argument("--dry-run", action="store_true", help="List messages without moving them.")
    parser.add_argument("--limit", type=int, default=0, help="Maximum number of messages to process.")
    args = parser.parse_args(argv)

    connection = pika.BlockingConnection(pika.URLParameters(Config.RABBITMQ_URL))
    channel = connection.channel()
    channel.confirm_delivery()
    pending = channel.queue_declare(queue=Config.PARKING_QUEUE_NAME, passive=True).method.message_count
    total = min(pending, args.limit) if args.limit else pending
    print(f"{pending} message(s) in '{Config.PARKING_QUEUE_NAME}'. Processing {total}"
          f"{' (dry run)' if args.dry_run else ''}...")

    moved = 0
    for _ in range(total):
        method, properties, body = channel.basic_get(queue=Config.PARKING_QUEUE_NAME, auto_ack=False)
        if method is None:
            break
        headers = dict(properties.headers or {})
        try:
            data = json.loads(body)
            summary = f"action={data.get('action')} variant={data.get('variant_id')}"
        except ValueError:
            summary = "invalid JSON"
        print(f"- {summary} | error: {headers.get('x-error', '')}")
        if args.dry_run:
            continue  # sin ack: vuelven a parking al cerrar la conexión
        for key in RESET_HEADERS:
            headers.pop(key, None)
        channel.basic_publish(
            exchange="",
            routing_key=Config.QUEUE_NAME,
            body=body,
            properties=pika.BasicProperties(delivery_mode=2, content_type="application/json", headers=headers),
        )
        channel.basic_ack(method.delivery_tag)
        moved += 1

    connection.close()
    print(f"Done. {moved} message(s) moved to '{Config.QUEUE_NAME}'.")
    return moved


if __name__ == "__main__":
    main()