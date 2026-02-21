## Development

### Running checks

To check the code against static checks, run:

```shell
make check
```

Sometimes errors this command produces (such as import sorting) can be fixed automatically using:

```shell
make fix
```

If the check command fails, make sure to always run the fix command first prior to trying to fix changes yourself.
