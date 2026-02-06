#!/bin/bash
set -e

echo "=== Deploying infrastructure components ==="
helm upgrade --install infra-${K8S_NAMESPACE} helm \
  --set namespace.name=${K8S_NAMESPACE} \
  --set ingress.host=${INGRESS_HOST} \
  --create-namespace
echo "✓ Infrastructure deployed successfully"
