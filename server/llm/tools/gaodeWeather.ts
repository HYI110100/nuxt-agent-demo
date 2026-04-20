import { createTool } from '../agent/nodes/toolManager';

export const gaodeWeatherTool = createTool({
    name: 'gaode_weather',
    description: '查询中国城市天气信息，包括实时天气和未来几天预报。需要传入城市编码（adcode）。',
    schema: [
        { name: 'city', type: 'string', description: '城市名称或城市编码（adcode），如"北京"或"110101"' },
        { name: 'extensions', type: 'string', description: '查询类型："base"-返回实况天气，"all"-返回预报天气' },
    ],
    execute: async (params: Record<string, any>) => {
        const { city, extensions = 'base' } = params;

        if (!city) {
            return { success: false, error: '缺少必要参数 city（城市名称或城市编码）' };
        }

        try {
            const url = new URL('https://restapi.amap.com/v3/weather/weatherInfo');
            url.searchParams.append('key', process.env.GAODE_API_KEY || '');
            url.searchParams.append('city', String(city));
            url.searchParams.append('extensions', extensions);

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return formatResponse(data, extensions);
        } catch (error) {
            console.error('高德天气查询失败:', error);
            return { success: false, error: error instanceof Error ? error.message : '未知错误' };
        }
    },
});

function formatResponse(data: any, extensions: string): any {
    if (data.status === '0') {
        return { success: false, error: data.info || '查询失败' };
    }

    const result: any = { success: true, infocode: data.infocode, info: data.info };

    if (extensions === 'base') {
        const live = data.lives?.[0];
        if (live) {
            result.type = '实况天气';
            result.province = live.province;
            result.city = live.city;
            result.adcode = live.adcode;
            result.weather = live.weather;
            result.temperature = `${live.temperature}°C`;
            result.winddirection = live.winddirection;
            result.windpower = live.windpower;
            result.humidity = `${live.humidity}%`;
            result.reporttime = live.reporttime;
        }
    } else {
        const forecast = data.forecasts?.[0];
        if (forecast) {
            result.type = '预报天气';
            result.province = forecast.province;
            result.city = forecast.city;
            result.adcode = forecast.adcode;
            result.reporttime = forecast.reporttime;

            if (forecast.casts && forecast.casts.length > 0) {
                result.forecast = forecast.casts.map((cast: any) => ({
                    date: cast.date,
                    week: cast.week,
                    dayWeather: cast.dayweather,
                    nightWeather: cast.nightweather,
                    dayTemp: `${cast.daytemp}°C`,
                    nightTemp: `${cast.nighttemp}°C`,
                    dayWind: cast.daywind,
                    nightWind: cast.nightwind,
                    dayPower: cast.daypower,
                    nightPower: cast.nightpower,
                }));
            }
        }
    }

    return result;
}
