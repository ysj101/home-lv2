import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/** Move が未登録のときに Settings へ誘導する。Dashboard / Task List で共用する。 */
export function NoMove({ description }: { description: string }) {
  return (
    <Card>
      <CardContent className="space-y-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button asChild>
          <Link to="/settings">引越しを登録する</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
