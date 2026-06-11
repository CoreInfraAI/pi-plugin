# CoreInfra Pi Plugin

Pi package that adds [CoreInfra AI Hub](https://hub.coreinfra.ai/) as a model provider.

## Usage

```bash
pi install npm:@coreinfra/pi-plugin@latest
```

Authenticate with either an environment variable:

```bash
export COREINFRA_API_KEY=...
pi
```

or from inside pi choose **Use an API key** and select `CoreInfra AI Hub` provider:

```text
/login
```

CoreInfra models are available under the `coreinfra/` provider, for example:

```bash
pi --model coreinfra/gpt-5.4-nano
pi --model coreinfra/claude-sonnet-4-20250514
pi --model coreinfra/deepseek-v4-pro
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `COREINFRA_API_KEY` | | CoreInfra API token |
| `COREINFRA_HUB_BASE_URL` | `https://hub.coreinfra.ai` | CoreInfra Hub base URL |

Model availability and prices are loaded from CoreInfra Hub on startup. Model behavior metadata is copied from pi's built-in OpenAI, Anthropic, and DeepSeek model definitions.
