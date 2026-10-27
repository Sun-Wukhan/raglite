# Kubernetes Notes

## Pods and restarts

A pod that keeps crashing usually shows up as CrashLoopBackOff in `kubectl get pods`. Read the previous container's logs with `kubectl logs <pod> --previous` to see why it exited. To restart a failed pod managed by a deployment, run `kubectl rollout restart deployment/<name>`; deleting the pod directly also works, because the ReplicaSet recreates it.

## Deployments and rollouts

A Deployment manages ReplicaSets and gives you rolling updates. Check rollout progress with `kubectl rollout status deployment/<name>`. If a new version is bad, `kubectl rollout undo deployment/<name>` returns to the previous revision. Set resource requests and limits on every container, or a single hungry pod can starve its neighbours on the node.

## Services and networking

A Service gives a stable DNS name and virtual IP in front of a set of pods. ClusterIP is internal only; NodePort exposes a high port on every node; LoadBalancer provisions a cloud load balancer. Ingress sits one level above services and routes HTTP traffic by host and path. When a service has no endpoints, check that its label selector actually matches the pod labels.
