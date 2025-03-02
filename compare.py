import requests

# Helius API key (replace with your own)
HELIUS_API_KEY = "c17f8211-3a4b-4591-9379-2069892fbbbd"
RPC_URL = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"

def get_token_traders(contract_address, max_pages=200):
    """Fetch wallet addresses that interacted with a given token contract, with pagination."""
    url = f"https://api.helius.xyz/v0/addresses/{contract_address}/transactions?api-key={HELIUS_API_KEY}"
    traders = set()
    last_signature = None  # Used for pagination
    
    for _ in range(max_pages):  # Fetch multiple pages of transactions
        query_url = url
        if last_signature:
            query_url += f"&before={last_signature}"
        
        response = requests.get(query_url)
        data = response.json()
        
        if not isinstance(data, list) or len(data) == 0:
            break  # No more transactions available
        
        for tx in data:
            last_signature = tx.get("signature")  # Store last transaction signature
            if "tokenTransfers" in tx:
                for transfer in tx["tokenTransfers"]:
                    traders.add(transfer["fromUserAccount"])
                    traders.add(transfer["toUserAccount"])
        
        print(f"Fetched {len(data)} transactions for {contract_address}, Total traders so far: {len(traders)}")

    return traders

def find_common_traders(contract_addresses):
    """Finds common traders among multiple token contracts."""
    all_traders = [get_token_traders(contract) for contract in contract_addresses]
    
    # Find common traders
    common_traders = set.intersection(*all_traders) if all_traders else set()
    return common_traders

if __name__ == "__main__":
    # Example contract addresses (replace with actual Solana token contracts)
    contract_addresses = [
        "BULsTNddDpKJafjXECazaSgozCNwc1yWzvCyU1z1pump",
        "7iCd6WdUHZU2X5B2L7xhyr5uS9rvuxWVQTLe732yDJXx",
        "12gjWnCM1vpjarp8VDjsKxSDA4QA6md6wMe7WwQmnews",
        "GvySy9u8yuU5HpQzJteZDMJxBYBgQbUaXsnoYKnSpump",
        "6BEZTH1itZddW3dabWjxSNojd96kVDgFXJCJGB3upump",
        "B3mT1s4LJXk16XvkXASpAvqXq1bieqyzMxqznj64PFYk"
    ]
    
    common_traders = find_common_traders(contract_addresses)
    print("Common Traders:", common_traders)
