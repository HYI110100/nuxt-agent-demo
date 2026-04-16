import { createTool } from '../agent/nodes/registry';

export const gaodeDistrictTool = createTool({
    name: 'gaode_district',
    description: '查询中国行政区划信息，支持按城市名称或 adcode 查询省市区县等各级行政区域详情。',
    schema: [
        { name: 'keywords', type: 'string', description: '查询关键字，可以是行政区名称（如"北京"）、citycode 或 adcode', required: true },
        { name: 'subdistrict', type: 'number', description: '返回下级行政区级数：0-不返回，1-下一级，2-下两级，默认 1' },
        { name: 'extensions', type: 'string', description: '返回结果控制："base"-不返回边界坐标，"all"-返回当前 district 边界值' },
    ],
    execute: async (params: Record<string, any>) => {
        const { keywords, subdistrict = 1, extensions = 'base' } = params;

        if (!keywords) {
            return { success: false, error: '缺少必要参数 keywords' };
        }

        try {
            const url = new URL('https://restapi.amap.com/v3/config/district');
            url.searchParams.append('key', process.env.GAODE_API_KEY || '');
            url.searchParams.append('keywords', keywords);
            url.searchParams.append('subdistrict', String(subdistrict));
            url.searchParams.append('extensions', extensions);

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return formatResponse(data);
        } catch (error) {
            console.error('高德行政区域查询失败:', error);
            return { success: false, error: error instanceof Error ? error.message : '未知错误' };
        }
    },
});

function formatResponse(data: any): any {
    if (data.status === '0') {
        return { success: false, error: data.info || '查询失败' };
    }

    const result: any = { success: true, info: data.info, infocode: data.infocode };

    if (data.suggestion) {
        result.suggestions = {
            keywords: data.suggestion.keywords,
            cities: data.suggestion.cities?.map((c: any) => ({
                name: c.name,
                adcode: c.adcode,
                citycode: c.citycode,
            })),
        };
    }

    if (data.districts && data.districts.length > 0) {
        result.districts = data.districts.map((d: any) => ({
            name: d.name,
            adcode: d.adcode,
            level: d.level,
            center: d.center,
            citycode: d.citycode,
            polyline: d.polyline,
            children: d.districts?.map((child: any) => ({
                name: child.name,
                adcode: child.adcode,
                level: child.level,
                center: child.center,
            })) || [],
        }));
    }

    return result;
}
