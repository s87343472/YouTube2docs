// 修复Excel知识图谱，基于真实教学内容设计合理的知识结构
const fs = require('fs');

// 重新设计的Excel知识图谱 - 基于真实教学逻辑
const correctedExcelKnowledgeGraph = {
  nodes: [
    // 核心概念层 - 最重要的基础概念
    { id: '1', label: 'Excel基础', type: 'concept', description: 'Microsoft Excel电子表格软件基础', importance: 5 },
    { id: '2', label: '储存格', type: 'concept', description: '行列交叉形成的数据单元', importance: 5 },
    { id: '3', label: '工作表', type: 'concept', description: 'Excel中的数据表格页面', importance: 4 },
    
    // 数据处理层 - 数据相关的概念和操作
    { id: '4', label: '数据格式', type: 'concept', description: '控制数据显示和识别方式', importance: 4 },
    { id: '5', label: '文字格式', type: 'application', description: '以文本形式存储数字数据', importance: 3 },
    { id: '6', label: '日期格式', type: 'application', description: '日期数据的标准化输入', importance: 3 },
    { id: '7', label: '货币格式', type: 'application', description: '添加货币符号的数字格式', importance: 3 },
    
    // 操作工具层 - 具体的功能和工具
    { id: '8', label: '格式刷', type: 'tool', description: '复制和应用格式的工具', importance: 3 },
    { id: '9', label: '快捷键', type: 'tool', description: '提高操作效率的键盘组合', importance: 4 },
    { id: '10', label: '复原功能', type: 'tool', description: 'Ctrl+Z撤销操作', importance: 3 }
  ],
  edges: [
    // 基础依赖关系
    { id: 'e1', source: '1', target: '2', type: 'supports', strength: 0.9, description: 'Excel基础包含储存格概念' },
    { id: 'e2', source: '1', target: '3', type: 'supports', strength: 0.8, description: 'Excel基础包含工作表概念' },
    
    // 数据格式体系
    { id: 'e3', source: '2', target: '4', type: 'relates', strength: 0.8, description: '储存格需要设定数据格式' },
    { id: 'e4', source: '4', target: '5', type: 'supports', strength: 0.7, description: '数据格式包含文字格式' },
    { id: 'e5', source: '4', target: '6', type: 'supports', strength: 0.7, description: '数据格式包含日期格式' },
    { id: 'e6', source: '4', target: '7', type: 'supports', strength: 0.7, description: '数据格式包含货币格式' },
    
    // 工具应用关系
    { id: 'e7', source: '8', target: '4', type: 'relates', strength: 0.6, description: '格式刷用于复制数据格式' },
    { id: 'e8', source: '9', target: '10', type: 'supports', strength: 0.8, description: '快捷键包含复原功能' },
    { id: 'e9', source: '1', target: '9', type: 'supports', strength: 0.7, description: 'Excel基础操作需要快捷键' }
  ]
};

// 改进的布局算法 - 分层次排列
function generateLayeredLayout(nodes, edges, width, height) {
  // 根据节点类型和重要性分层
  const layers = {
    concept: [], // 概念层
    application: [], // 应用层  
    tool: [] // 工具层
  };
  
  // 按类型分组
  nodes.forEach(node => {
    if (layers[node.type]) {
      layers[node.type].push(node);
    } else {
      layers.concept.push(node); // 默认归入概念层
    }
  });
  
  // 按重要性排序
  Object.keys(layers).forEach(key => {
    layers[key].sort((a, b) => (b.importance || 0) - (a.importance || 0));
  });
  
  const layerHeight = height / 4;
  const positions = [];
  
  // 概念层 - 顶部
  const conceptY = layerHeight;
  layers.concept.forEach((node, index) => {
    const x = (width / (layers.concept.length + 1)) * (index + 1);
    positions.push({
      ...node,
      x: x,
      y: conceptY,
      radius: Math.max(40, Math.min(60, 40 + (node.importance || 3) * 3))
    });
  });
  
  // 应用层 - 中部
  const appY = layerHeight * 2.5;
  layers.application.forEach((node, index) => {
    const x = (width / (layers.application.length + 1)) * (index + 1);
    positions.push({
      ...node,
      x: x,
      y: appY,
      radius: Math.max(35, Math.min(50, 35 + (node.importance || 3) * 3))
    });
  });
  
  // 工具层 - 底部
  const toolY = layerHeight * 3.2;
  layers.tool.forEach((node, index) => {
    const x = (width / (layers.tool.length + 1)) * (index + 1);
    positions.push({
      ...node,
      x: x,
      y: toolY,
      radius: Math.max(35, Math.min(50, 35 + (node.importance || 3) * 3))
    });
  });
  
  return positions;
}

function getModernRelationColor(type) {
  switch (type) {
    case 'supports': return '#667eea';
    case 'relates': return '#11998e';
    case 'depends': return '#ff6b6b';
    case 'part_of': return '#feca57';
    case 'similar': return '#a55eea';
    default: return '#95a5a6';
  }
}

function getNodeGradient(type) {
  switch (type) {
    case 'concept': return 'conceptGradient';
    case 'tool': return 'supportGradient';
    case 'application': return 'applicationGradient';
    case 'process': return 'applicationGradient';
    default: return 'conceptGradient';
  }
}

function getNodeIcon(type) {
  switch (type) {
    case 'concept': return '💡';
    case 'tool': return '🔧';
    case 'application': return '🎯';
    case 'process': return '⚙️';
    default: return '📝';
  }
}

function generateCorrectedKnowledgeGraphSVG(knowledgeGraph) {
  const nodes = knowledgeGraph.nodes || [];
  const edges = knowledgeGraph.edges || [];
  
  const svgWidth = 1000;
  const svgHeight = 600; // 减少一点高度，更紧凑
  
  // 使用分层布局
  const nodePositions = generateLayeredLayout(nodes, edges, svgWidth, svgHeight);
  
  const svgContent = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" 
         style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      
      <defs>
        <linearGradient id="conceptGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        
        <linearGradient id="supportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
        </linearGradient>
        
        <linearGradient id="applicationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#feca57;stop-opacity:1" />
        </linearGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      
      <!-- 层级标签 -->
      <text x="50" y="100" font-size="14" font-weight="bold" fill="#666" opacity="0.7">核心概念层</text>
      <text x="50" y="250" font-size="14" font-weight="bold" fill="#666" opacity="0.7">应用操作层</text>
      <text x="50" y="380" font-size="14" font-weight="bold" fill="#666" opacity="0.7">工具功能层</text>
      
      <!-- 连接线 -->
      ${edges.map((edge) => {
        const sourceNode = nodePositions.find((n) => n.id === edge.source);
        const targetNode = nodePositions.find((n) => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return '';
        
        const color = getModernRelationColor(edge.type);
        const strokeWidth = edge.strength ? Math.max(2, edge.strength * 3) : 2;
        
        return `
          <g>
            <line x1="${sourceNode.x}" y1="${sourceNode.y}" 
                  x2="${targetNode.x}" y2="${targetNode.y}"
                  stroke="rgba(0,0,0,0.1)" 
                  stroke-width="${strokeWidth + 1}" 
                  opacity="0.3"/>
            
            <line x1="${sourceNode.x}" y1="${sourceNode.y}" 
                  x2="${targetNode.x}" y2="${targetNode.y}"
                  stroke="${color}" 
                  stroke-width="${strokeWidth}" 
                  stroke-linecap="round"
                  opacity="0.7"/>
            
            <circle cx="${targetNode.x}" cy="${targetNode.y}" r="3" 
                    fill="${color}" 
                    opacity="0.8"/>
          </g>
        `;
      }).join('')}
      
      <!-- 节点 -->
      ${nodePositions.map((node) => {
        const nodeSize = node.radius || Math.max(35, Math.min(55, 35 + (node.importance || 3) * 3));
        const gradient = getNodeGradient(node.type);
        const labelWidth = Math.max(80, node.label.length * 7);
        
        return `
          <g filter="url(#shadow)">
            <circle cx="${node.x}" cy="${node.y}" r="${nodeSize + 4}" 
                    fill="rgba(255,255,255,0.3)" 
                    opacity="0.6"/>
            
            <circle cx="${node.x}" cy="${node.y}" r="${nodeSize}" 
                    fill="url(#${gradient})" 
                    stroke="rgba(255,255,255,0.8)" 
                    stroke-width="2"
                    filter="url(#glow)"/>
            
            <text x="${node.x}" y="${node.y + 6}" 
                  text-anchor="middle" 
                  font-size="${Math.max(16, nodeSize / 3)}" 
                  fill="white" 
                  font-weight="bold">
              ${getNodeIcon(node.type)}
            </text>
            
            <rect x="${node.x - labelWidth/2}" y="${node.y + nodeSize + 10}" 
                  width="${labelWidth}" height="24" 
                  fill="rgba(255,255,255,0.95)" 
                  rx="12" 
                  stroke="rgba(0,0,0,0.1)" 
                  stroke-width="1"/>
            
            <text x="${node.x}" y="${node.y + nodeSize + 25}" 
                  text-anchor="middle" 
                  font-size="12" 
                  font-weight="600"
                  fill="#2c3e50">
              ${node.label}
            </text>
            
            ${Array.from({length: 5}).map((_, i) => `
              <circle cx="${node.x - 20 + i * 10}" cy="${node.y + nodeSize + 40}" r="2" 
                      fill="${i < (node.importance || 3) ? '#feca57' : 'rgba(0,0,0,0.1)'}"/>
            `).join('')}
          </g>
        `;
      }).join('')}
      
      <!-- 现代化图例 -->
      <g transform="translate(650, 30)">
        <rect x="0" y="0" width="320" height="200" 
              fill="rgba(255,255,255,0.95)" 
              stroke="rgba(0,0,0,0.1)" 
              rx="12" 
              filter="url(#shadow)"/>
        
        <text x="20" y="30" font-size="16" font-weight="bold" fill="#2c3e50">Excel知识结构图</text>
        
        <g transform="translate(20, 50)">
          <text x="0" y="0" font-size="13" font-weight="bold" fill="#666">节点类型</text>
          
          <circle cx="10" cy="25" r="8" fill="url(#conceptGradient)"/>
          <text x="25" y="30" font-size="12" fill="#2c3e50">💡 基础概念 (重要度5)</text>
          
          <circle cx="10" cy="50" r="7" fill="url(#applicationGradient)"/>
          <text x="25" y="55" font-size="12" fill="#2c3e50">🎯 应用操作 (重要度3)</text>
          
          <circle cx="10" cy="75" r="7" fill="url(#supportGradient)"/>
          <text x="25" y="80" font-size="12" fill="#2c3e50">🔧 工具功能 (重要度3-4)</text>
        </g>
        
        <g transform="translate(20, 140)">
          <text x="0" y="0" font-size="13" font-weight="bold" fill="#666">关系类型</text>
          
          <line x1="0" y1="20" x2="20" y2="20" stroke="#667eea" stroke-width="2" stroke-linecap="round"/>
          <text x="25" y="25" font-size="12" fill="#2c3e50">支持关系</text>
          
          <line x1="0" y1="40" x2="20" y2="40" stroke="#11998e" stroke-width="2" stroke-linecap="round"/>
          <text x="25" y="45" font-size="12" fill="#2c3e50">相关关系</text>
        </g>
      </g>
    </svg>
  `;
  
  return svgContent;
}

// 生成修正后的HTML
const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>修正后的Excel知识图谱</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .comparison {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .comparison h3 {
            color: #2c3e50;
            margin-top: 0;
        }
        .comparison ul {
            color: #555;
            line-height: 1.6;
        }
        .graph-container {
            text-align: center;
            margin: 20px 0;
        }
        .logic-explanation {
            background: #fff3e0;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .logic-explanation h3 {
            color: #e65100;
            margin-top: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 修正后的Excel知识图谱</h1>
        
        <div class="comparison">
            <h3>🎯 主要修正：</h3>
            <ul>
                <li><strong>逻辑结构优化：</strong>按照教学逻辑分为核心概念层、应用操作层、工具功能层</li>
                <li><strong>节点合理性：</strong>移除了"复制粘贴"等过于细节的操作，聚焦核心知识点</li>
                <li><strong>重要性重新评估：</strong>Excel基础、储存格等核心概念重要度最高</li>
                <li><strong>关系梳理：</strong>建立了清晰的支持和相关关系，符合学习路径</li>
                <li><strong>分层布局：</strong>使用分层布局替代随机布局，更符合知识结构</li>
            </ul>
        </div>
        
        <div class="graph-container">
            ${generateCorrectedKnowledgeGraphSVG(correctedExcelKnowledgeGraph)}
        </div>
        
        <div class="logic-explanation">
            <h3>📚 知识结构说明：</h3>
            <p><strong>核心概念层：</strong>Excel基础、储存格、工作表等最基本的概念，是学习的基础</p>
            <p><strong>应用操作层：</strong>各种数据格式设定，是实际使用中的具体应用</p>
            <p><strong>工具功能层：</strong>格式刷、快捷键等提高效率的工具和功能</p>
            <br>
            <p>这样的结构更符合Excel教学的逻辑顺序：先理解基础概念，再学习具体应用，最后掌握效率工具。</p>
        </div>
    </div>
</body>
</html>
`;

fs.writeFileSync('corrected-excel-knowledge-graph.html', htmlContent);
console.log('✅ 修正后的Excel知识图谱已生成: corrected-excel-knowledge-graph.html');
console.log('📖 请在浏览器中打开该文件查看修正效果');
console.log('');
console.log('🔧 主要修正：');
console.log('1. 重新设计了符合Excel教学逻辑的知识结构');
console.log('2. 使用分层布局，清晰展示知识层次');
console.log('3. 移除了不合理的细节操作节点');
console.log('4. 重新评估了各概念的重要性和关系');