# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **contact@developico.com**

When reporting a vulnerability, please include:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** assessment
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**
2. **Assessment**: We will investigate and assess the vulnerability within **7 days**
3. **Resolution**: We will work with you to resolve the issue and coordinate disclosure
4. **Credit**: We will credit you in our security advisories (unless you prefer anonymity)

## Security Best Practices for Deployment

When deploying this solution, please follow these security guidelines:

### Secrets Management

- ✅ **Never commit secrets to git** - Use `.env.example` as a template
- ✅ **Use Azure Key Vault** for all production credentials
- ✅ **Rotate secrets regularly** - Especially KSeF tokens before expiry
- ✅ **Use Managed Identities** where possible for Azure resources

### Azure Configuration

- ✅ **Enable RBAC** on all Azure resources
- ✅ **Configure proper CORS** - Never use `*` in production
- ✅ **Use Private Endpoints** for Key Vault in production
- ✅ **Enable Azure Defender** for cloud resources
- ✅ **Enable audit logging** in Azure resources

### Authentication

- ✅ **Never enable SKIP_AUTH in production** - The app will crash on startup if attempted
- ✅ **Configure security groups** properly in Entra ID
- ✅ **Use least privilege principle** for service accounts
- ✅ **Enable MFA** for all administrator accounts

### Application Security

- ✅ **Keep dependencies updated** - Use Dependabot or similar
- ✅ **Review code changes** before merging
- ✅ **Run security scans** as part of CI/CD
- ✅ **Monitor for suspicious activity** using Application Insights

## Known Security Considerations

### KSeF Token Storage

KSeF authorization tokens are stored in Azure Key Vault with the following protections:

- Tokens are never logged or exposed in API responses
- Access to Key Vault is restricted via RBAC
- Tokens have expiration dates that are tracked and warned about

### Data in Dataverse

Invoice data is stored in Microsoft Dataverse with:

- Row-level security based on business unit
- Audit trail for all modifications
- Encryption at rest

### AI Processing

When AI categorization is enabled:

- Invoice data is sent to Azure OpenAI (not third-party)
- Data stays within your Azure tenant
- No invoice data is used for model training

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. We recommend:

1. **Watch this repository** for security advisories
2. **Subscribe to release notifications**
3. **Keep your deployment updated**

## Contact

- Security issues: contact@developico.com
- General questions: [GitHub Discussions](https://github.com/Developico/KSeFCopilot/discussions)

Maintained by **[Developico Sp. z o.o.](https://developico.com)** | Łukasz Falaciński

---

Thank you for helping keep KSeF Copilot and its users safe! 🔒
