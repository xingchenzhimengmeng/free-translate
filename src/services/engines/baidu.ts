import type { TranslationEngine } from './base';
import { toBaiduLang } from '../languages';
import { md5 } from '../../utils/md5';
import { getCredentials } from '../../utils/storage';

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1100;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - diff));
  }
  lastRequestTime = Date.now();
}

export const baiduEngine: TranslationEngine = {
  id: 'baidu',
  name: '百度翻译',
  async translate(texts: string[], from: string, to: string): Promise<string[]> {
    if (texts.length === 0) return [];
    const creds = await getCredentials();
    const appid = creds.baiduAppId.trim();
    const key = creds.baiduSecretKey.trim();

    if (!appid || !key) {
      throw new Error('未配置百度翻译 App ID 或密钥，请在设置中填写');
    }

    await waitForRateLimit();

    const q = texts.join('\n');
    const salt = Date.now().toString();
    const sign = md5(appid + q + salt + key);

    const fromLang = from === 'auto' ? 'auto' : toBaiduLang(from);
    const toLang = toBaiduLang(to);

    const formData = new URLSearchParams();
    formData.append('q', q);
    formData.append('from', fromLang);
    formData.append('to', toLang);
    formData.append('appid', appid);
    formData.append('salt', salt);
    formData.append('sign', sign);

    const res = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      throw new Error(`百度翻译网络请求错误: ${res.status}`);
    }

    const data = (await res.json()) as {
      error_code?: string;
      error_msg?: string;
      trans_result?: Array<{ src: string; dst: string }>;
    };

    if (data.error_code && data.error_code !== '52000') {
      throw new Error(`百度翻译错误 [${data.error_code}]: ${data.error_msg}`);
    }

    if (!data.trans_result || data.trans_result.length === 0) {
      return texts;
    }

    // trans_result is mapped line by line
    return texts.map((original, i) => data.trans_result?.[i]?.dst || original);
  },
};
