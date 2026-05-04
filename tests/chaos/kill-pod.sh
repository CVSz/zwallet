#!/bin/bash

# Chaos test: randomly kill a pod
POD=$(kubectl get pods -n zwallet -o jsonpath='{.items[0].metadata.name}')
echo "Killing pod: $POD"
kubectl delete pod $POD -n zwallet
