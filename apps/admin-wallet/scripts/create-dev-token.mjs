import jwt from "jsonwebtoken";

const secret = process.env.ZWALLET_DEV_TOKEN;

if (!secret) {
  console.error("ZWALLET_DEV_TOKEN is required");
  process.exit(1);
}

const token = jwt.sign(
  {
    sub: "dev-admin",
    email: "dev-admin@localhost",
    name: "Dev Admin",
    roles: ["admin"]
  },
  secret,
  {
    expiresIn: "12h"
  }
);

console.log(token);
