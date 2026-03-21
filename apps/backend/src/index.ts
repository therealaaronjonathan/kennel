import { app } from './app'

const port = Number(Bun.env.PORT ?? 3000)

app.listen(port, () => {
  console.log(`[backend] running on http://localhost:${port}`)
})
