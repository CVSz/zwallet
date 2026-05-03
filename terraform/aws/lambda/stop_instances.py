import boto3


ec2 = boto3.client("ec2")


def lambda_handler(event, context):
    instances = ec2.describe_instances()
    ids = []

    for reservation in instances.get("Reservations", []):
        for instance in reservation.get("Instances", []):
            if instance.get("State", {}).get("Name") == "running":
                ids.append(instance["InstanceId"])

    if ids:
        ec2.stop_instances(InstanceIds=ids)

    return {"stopped_instances": ids}
