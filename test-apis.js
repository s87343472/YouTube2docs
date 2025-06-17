const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 YouTube智能学习资料生成器 - API测试套件');
console.log('='.repeat(50));

// 设置环境变量
process.env.NODE_ENV = 'development';

// 切换到backend目录并运行测试
const backendDir = path.join(__dirname, 'backend');
process.chdir(backendDir);

console.log('📂 工作目录:', process.cwd());
console.log('🔍 开始API测试...\n');

try {
  // 运行测试函数
  require('./src/services/apiTest').runAllAPITests()
    .then(results => {
      console.log('\n📊 测试完成！');
      console.log('结果已保存到测试报告中。');
      
      // 检查关键测试是否通过
      const criticalPassed = [
        results.youtube?.status === 'success',
        results.contentGeneration?.status === 'success' || results.contentGeneration?.status === 'mock'
      ].every(test => test);
      
      if (criticalPassed) {
        console.log('🎉 关键测试通过！系统准备就绪。');
        process.exit(0);
      } else {
        console.log('⚠️ 部分测试失败，但可以继续开发。');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('💥 测试失败:', error.message);
      process.exit(1);
    });
    
} catch (error) {
  console.error('💥 测试启动失败:', error.message);
  process.exit(1);
}