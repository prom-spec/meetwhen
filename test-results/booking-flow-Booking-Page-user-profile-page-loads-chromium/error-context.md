# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Something went wrong" [level=1] [ref=e3]
    - paragraph [ref=e4]: Don't worry, your bookings are safe. Try refreshing the page.
    - generic [ref=e5]:
      - button "Try again" [ref=e6]
      - link "Go to dashboard" [ref=e7] [cursor=pointer]:
        - /url: /dashboard
  - alert [ref=e8]
```