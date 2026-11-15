import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
import { Button } from './button'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>SIP Trunk Profile</CardTitle>
        <CardDescription>OmniPCX Enterprise SIP trunk 172.19.112.51</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Status: Active / Ready for test traffic</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Inspect Node</Button>
      </CardFooter>
    </Card>
  ),
}
