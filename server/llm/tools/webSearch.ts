import { createTool } from '../agent/nodes/toolManager';

export const webSearchTool = createTool({
    name: 'web_search',
    description: '在网络上搜索实时信息，包括新闻、事件、知识等。适合查询最新数据、事实验证和补充背景信息。',
    schema: [
        {
            name: 'query',
            type: 'string',
            description: '搜索关键词或问题',
            required: true
        },
        {
            name: 'num',
            type: 'number',
            description: '返回结果数量（1-10），默认为 5',
            optional: [{ value: 5, description: '默认 5 个结果' }]
        },
        {
            name: 'dateRange',
            type: 'string',
            description: '时间范围限制："d"-最近 24 小时，"w"-最近 7 天，"m"-最近 30 天，"y"-过去一年',
            optional: [
                { value: 'd', description: '最近 24 小时' },
                { value: 'w', description: '最近 7 天' },
                { value: 'm', description: '最近 30 天' },
                { value: 'y', description: '过去一年' }
            ]
        },
    ],
    execute: async (params: Record<string, any>) => {
        const { query, num = 5, dateRange } = params;

        if (!query) {
            return { success: false, error: '缺少必要参数 query（搜索关键词）' };
        }

        try {
            const url = new URL('https://google.serper.dev/search');
            url.searchParams.append('q', query);
            url.searchParams.append('num', String(num));

            if (dateRange) {
                url.searchParams.append('dateRestrict', `1${dateRange}`);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'X-API-KEY': process.env.SERPER_API_KEY || '',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return formatResponse(data);
        } catch (error) {
            console.error('Web 搜索失败:', error);
            return { success: false, error: error instanceof Error ? error.message : '未知错误' };
        }
    },
});

function formatResponse(data: any): any {
    const result: any = {
        success: true,
        searchParameters: data.searchParameters,
        knowledgeGraph: null,
        organic: [],
        relatedSearches: [],
    };

    // 知识图谱
    if (data.knowledgeGraph) {
        const kg = data.knowledgeGraph;
        result.knowledgeGraph = {
            title: kg.title,
            description: kg.description,
            imageUrl: kg.imageUrl,
            types: kg.types,
            attributes: kg.attributes,
        };
    }

    // 搜索结果
    if (data.organic && data.organic.length > 0) {
        result.organic = data.organic.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            date: item.date || null,
        }));
    }

    // 相关搜索
    if (data.relatedSearches && data.relatedSearches.length > 0) {
        result.relatedSearches = data.relatedSearches;
    }

    return result;
}
