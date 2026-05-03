from web3 import Web3
from web3.exceptions import Web3Exception
from app.core.config import settings


class EthereumClient:
    def __init__(self) -> None:
        self.w3 = Web3(Web3.HTTPProvider(settings.ethereum_rpc_url, request_kwargs={"timeout": 10}))

    def transfer_eth(self, from_address: str, to_address: str, amount_eth: float, private_key: str) -> str:
        if amount_eth > settings.max_tx_value_eth:
            raise ValueError("Transfer exceeds policy limit")
        try:
            nonce = self.w3.eth.get_transaction_count(from_address)
            tx = {
                "nonce": nonce,
                "to": to_address,
                "value": self.w3.to_wei(amount_eth, "ether"),
                "gas": 21000,
                "maxFeePerGas": self.w3.eth.gas_price,
                "maxPriorityFeePerGas": self.w3.to_wei(1, "gwei"),
                "chainId": self.w3.eth.chain_id,
            }
            signed = self.w3.eth.account.sign_transaction(tx, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            return tx_hash.hex()
        except Web3Exception as exc:
            raise RuntimeError(f"Blockchain error: {exc}") from exc
