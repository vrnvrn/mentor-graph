# Arkiv Network Rate Limit Information

## ✅ Rate Limit Confirmed by Arkiv Team

**Rate Limit: 50 Requests Per Second (RPS)**

This is very generous and should not limit development! With 50 RPS, you can:
- Make 50 requests per second
- That's 1 request every 20ms
- Using 100ms delays = 10 requests/second (well under limit)
- Seed script will complete in ~2 seconds instead of ~2 minutes

## Error Details

### HTTP Response
- **Status Code**: `429` (Too Many Requests)
- **Error Code**: `-32016`
- **Error Message**: `"over rate limit"`

### Endpoint
- **URL**: `https://mendoza.hoodi.arkiv.network/rpc`
- **Method**: `eth_sendRawTransaction` (via Arkiv SDK `createEntity`)

### Request Details
- **Chain**: Mendoza (id: 60138453056)
- **Transaction Type**: Entity creation (user profiles, asks, offers, sessions, feedback, trust edges)
- **SDK Version**: `@arkiv-network/sdk@0.4.4`
- **Viem Version**: `2.39.0`

## Observed Behavior

### Rate Limit Triggers
1. **First attempt**: Profile creation failed immediately with 429
2. **Second attempt** (after 1 second delay): Profile creation failed immediately with 429
3. **Third attempt** (after 1 second delay): Profile creation failed immediately with 429

### Current Seed Script Configuration
- Initial delay: 1 second before first operation
- Inter-operation delay: 5 seconds between each entity creation
- Total entities to create: 18 (1 profile + 4 asks + 4 offers + 3 sessions + 3 feedback + 3 trust edges)
- Estimated completion time: ~2 minutes (if rate limit allows)

## Questions for Arkiv Team

1. **What is the exact rate limit?**
   - Requests per second?
   - Requests per minute?
   - Requests per hour?
   - Is it per wallet address or per IP address?

2. **What is the rate limit reset window?**
   - How long do we need to wait after hitting the limit?
   - Is there a cooldown period?

3. **Are there different limits for different operations?**
   - Entity creation vs. queries?
   - Different entity types (profiles, asks, offers, sessions, etc.)?

4. **Is there a way to check current rate limit status?**
   - Headers in responses?
   - Rate limit info endpoint?

5. **Are there any best practices for avoiding rate limits?**
   - Recommended delays between operations?
   - Batch operations available?

6. **Is there a test/dev environment with higher limits?**
   - For development/testing purposes?

## Error Example

```json
{
  "code": -32016,
  "message": "over rate limit"
}
```

**Full Error Response:**
```
Status: 429
URL: https://mendoza.hoodi.arkiv.network/rpc
Request body: {"method":"eth_sendRawTransaction","params":["0x02f903..."]}
Details: {"code":-32016,"message":"over rate limit"}
```

## Current Workaround

The seed script includes delays between operations:
- 1 second initial delay
- 5 seconds between each entity creation

However, even the first operation (profile creation) is hitting the rate limit, suggesting:
- Either a very strict limit (possibly 1 request per minute or less)
- Or a cooldown period from previous attempts
- Or rate limiting based on wallet/IP that hasn't reset yet

## Recommendations

1. **Implement exponential backoff retry logic** in the seed script
2. **Add rate limit detection** and automatic waiting
3. **Consider batching** if Arkiv supports it
4. **Use a test environment** with higher limits if available

