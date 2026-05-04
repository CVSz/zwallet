import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
};

export default function () {
  const res = http.get('http://zwallet-api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
