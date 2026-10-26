# usage-line

A Claude Code mod that shows your plan usage just above the prompt:

```
5-hour 24% (resets in 2h 14m) · Weekly 41% (resets in 3d 4h)
```

The percentage turns yellow at 75% and red at 90%. The line appears after Claude's first reply in a session (that's when usage is first reported) and updates after every turn.

It needs a Claude subscription (Pro or Max). With an API key there are no plan limits to show, so the line stays hidden.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install usage-line --marketplace tomrplummer/usage-line
```

Answer `y` to add the marketplace, then press Enter to install for your user. It starts working right away.

From a shell:

```bash
claude plugin install usage-line --marketplace tomrplummer/usage-line
```

In the Claude desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `tomrplummer/usage-line`, then **Add plugin**. A mod installed from a terminal for your user also shows in the desktop app's Code tab.

## Develop

```bash
claude plugin validate .
claude plugin test .
```
