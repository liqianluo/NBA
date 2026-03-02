const crypto = require('crypto');

/**
 * 生成 RSA-SHA256 签名
 * @param {string} apiKey - API Key
 * @param {string} privateKeyBase64 - Base64 编码的 PKCS#8 私钥
 * @param {Object} params - 请求参数（可选）
 * @returns {{ signature: string, timestamp: string }}
 */
function generateSignature(apiKey, privateKeyBase64, params = {}) {
  const timestamp = Date.now().toString();

  // 构建待签名字符串
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  let stringToSign = `apiKey=${apiKey}&timestamp=${timestamp}`;
  if (sortedParams) {
    stringToSign += `&${sortedParams}`;
  }

  // 将 Base64 私钥转换为 PEM 格式
  const privateKeyPem = [
    '-----BEGIN PRIVATE KEY-----',
    ...privateKeyBase64.match(/.{1,64}/g),
    '-----END PRIVATE KEY-----'
  ].join('\n');

  // 生成 RSA-SHA256 签名
  const sign = crypto.createSign('SHA256');
  sign.update(stringToSign);
  sign.end();
  const signature = sign.sign(privateKeyPem, 'base64');

  return { signature, timestamp };
}

/**
 * 构建请求头
 */
function buildHeaders(apiKey, privateKeyBase64, params = {}) {
  const { signature, timestamp } = generateSignature(apiKey, privateKeyBase64, params);
  return {
    'X-API-Key': apiKey,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
}

module.exports = { generateSignature, buildHeaders };
