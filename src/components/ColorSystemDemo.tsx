import React from 'react';
import { figmaColors, figmaTailwindClasses, materialShadows } from '../utils/figma-colors';
import { Card } from './ui/card';
import { Button } from './ui/button';

export function ColorSystemDemo() {
  const ColorSwatch = ({ color, name, description }: { color: string; name: string; description: string }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E0E0E0]">
      <div 
        className="w-12 h-12 rounded-lg border border-[#E0E0E0]" 
        style={{ backgroundColor: color }}
      />
      <div>
        <h4 className="font-medium text-[#202124]">{name}</h4>
        <p className="text-sm text-[#5F6368]">{description}</p>
        <code className="text-xs text-[#1A73E8]">{color}</code>
      </div>
    </div>
  );

  const ShadowExample = ({ shadow, name }: { shadow: string; name: string }) => (
    <div className="text-center">
      <div 
        className="w-16 h-16 bg-white rounded-lg mx-auto mb-2"
        style={{ boxShadow: shadow }}
      />
      <p className="text-sm text-[#5F6368]">{name}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl text-[#202124] mb-2">Figma 设计系统</h1>
        <p className="text-[#5F6368]">基于 Figma Color Styles 的完整颜色规范</p>
      </div>

      {/* Base Colors */}
      <Card className="p-6">
        <h2 className="text-xl text-[#202124] mb-4">基础颜色 (Base Colors)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ColorSwatch 
            color={figmaColors.base.primaryBlue}
            name="Primary Blue"
            description="主按钮、主链接"
          />
          <ColorSwatch 
            color={figmaColors.base.primaryHoverBlue}
            name="Primary Hover Blue"
            description="按钮 hover 态"
          />
          <ColorSwatch 
            color={figmaColors.base.backgroundWhite}
            name="Background White"
            description="页面背景"
          />
          <ColorSwatch 
            color={figmaColors.base.lightGray}
            name="Light Gray"
            description="模块背景"
          />
          <ColorSwatch 
            color={figmaColors.base.darkFooter}
            name="Dark Footer"
            description="页脚背景"
          />
        </div>
      </Card>

      {/* Text Colors */}
      <Card className="p-6">
        <h2 className="text-xl text-[#202124] mb-4">文本颜色 (Text Colors)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ColorSwatch 
            color={figmaColors.text.primary}
            name="Text Primary"
            description="主标题、正文"
          />
          <ColorSwatch 
            color={figmaColors.text.secondary}
            name="Text Secondary"
            description="副标题、说明"
          />
          <ColorSwatch 
            color={figmaColors.text.inverse}
            name="Text Inverse"
            description="深色背景上的文字"
          />
        </div>
      </Card>

      {/* Google Accent Colors */}
      <Card className="p-6">
        <h2 className="text-xl text-[#202124] mb-4">Google 强调色 (Google Accent Colors)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ColorSwatch 
            color={figmaColors.google.blue}
            name="Google Blue"
            description="插画/Icon"
          />
          <ColorSwatch 
            color={figmaColors.google.red}
            name="Google Red"
            description="插画/Icon"
          />
          <ColorSwatch 
            color={figmaColors.google.yellow}
            name="Google Yellow"
            description="插画/Icon"
          />
          <ColorSwatch 
            color={figmaColors.google.green}
            name="Google Green"
            description="插画/Icon"
          />
        </div>
      </Card>

      {/* Interactive Examples */}
      <Card className="p-6">
        <h2 className="text-xl text-[#202124] mb-4">交互示例</h2>
        <div className="flex flex-wrap gap-4">
          <Button className="bg-[#1A73E8] hover:bg-[#1557B0] text-white">
            Primary Button
          </Button>
          <Button className="bg-[#4285F4] hover:bg-[#1A73E8] text-white">
            Google Blue Button
          </Button>
          <Button className="bg-[#34A853] hover:bg-[#2E7D32] text-white">
            Success Button
          </Button>
          <Button className="bg-[#EA4335] hover:bg-[#D32F2F] text-white">
            Error Button
          </Button>
          <Button className="bg-[#F8F9FA] hover:bg-[#E0E0E0] text-[#202124] border border-[#E0E0E0]">
            Secondary Button
          </Button>
        </div>
      </Card>

      {/* Material Shadows */}
      <Card className="p-6">
        <h2 className="text-xl text-[#202124] mb-4">Material Design 阴影</h2>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(materialShadows).map(([key, shadow]) => (
            <ShadowExample key={key} shadow={shadow} name={key} />
          ))}
        </div>
      </Card>

      {/* Color Usage in Charts */}
      <Card className="p-6">
        <h2 className="text-xl text-[#202124] mb-4">图表配色示例</h2>
        <div className="flex gap-2">
          {[
            figmaColors.google.blue,
            figmaColors.google.green,
            figmaColors.google.yellow,
            figmaColors.google.red,
            figmaColors.base.primaryBlue
          ].map((color, index) => (
            <div 
              key={index}
              className="w-8 h-24 rounded-t"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <p className="text-sm text-[#5F6368] mt-2">适用于数据可视化的和谐配色方案</p>
      </Card>
    </div>
  );
}