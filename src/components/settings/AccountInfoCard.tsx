import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { IdCard, Copy, Check } from 'lucide-react';

interface AccountInfoCardProps {
  userId: string;
  roleLabel: string;
}

export function AccountInfoCard({ userId, roleLabel }: AccountInfoCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IdCard className="w-5 h-5" />
          账户信息
        </CardTitle>
        <CardDescription>{roleLabel} ID 可用于技术支持或问题反馈</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input value={userId} readOnly className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={handleCopy} title="复制">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
