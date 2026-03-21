import type { SupportedPlatform } from '../../../types/llm';
import { AliyunPlatform } from './aliyun';

// 支持的平台列表
export const supportedPlatforms: { value: SupportedPlatform; label: string }[] = [
  { value: 'aliyun', label: '阿里云' },
  // 可以在这里添加更多平台
];

// 平台映射
export const platformMap: Record<SupportedPlatform, typeof AliyunPlatform> = {
  aliyun: AliyunPlatform,
  // 可以在这里添加更多平台映射
};

// 根据平台类型创建平台实例
export function hasPlatform(platformType: SupportedPlatform) {
  if (!platformMap[platformType]) {
    return false;
  }
  return true;
}
