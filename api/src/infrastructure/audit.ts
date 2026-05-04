export function audit(event: string, payload: unknown) {
  console.log(JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString()
  }));
}
