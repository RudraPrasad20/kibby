import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function Cards() {
  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Instant Previews</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Preview UI changes in isolation with fast refresh and great ergonomics.
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Composable UI</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Build from small, accessible primitives into robust patterns your team can trust.
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Production Ready</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ship with sensible defaults: theming, dark mode, and responsive layouts baked in.
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
