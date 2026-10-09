export type ComponentModifiers = {};

export type ComponentModifierBuilder<T extends Record<string, boolean | undefined>> = {
  [K in keyof T]-?: () => ComponentModifierBuilder<T>;
};

export type ComponentWithModifiers<T extends Record<string, boolean | undefined>> = (
  modifiers: ComponentModifierBuilder<T>
) => ComponentModifierBuilder<T>;

function createModifierBuilder<T extends Record<string, boolean | undefined>>(
  activeModifiers: Partial<T> = {}
): ComponentModifierBuilder<T> {
  return new Proxy(
    {},
    {
      get(_, prop) {
        return () => createModifierBuilder<T>({ ...activeModifiers, [prop]: true } as Partial<T>);
      },
      ownKeys() {
        return Reflect.ownKeys(activeModifiers);
      },
      getOwnPropertyDescriptor(_, prop) {
        if (prop in activeModifiers) {
          return {
            configurable: true,
            enumerable: true,
            writable: false,
            value: true
          };
        }

        return undefined;
      },
      has(_, prop) {
        return prop in activeModifiers;
      }
    }
  ) as ComponentModifierBuilder<T>;
}

export function getModifierClasses<T extends Record<string, boolean | undefined>>(
  modifiers: ComponentWithModifiers<T> | undefined,
  componentName: string
): string {
  if (!modifiers) return "";

  const resolvedModifiers = modifiers(createModifierBuilder<T>());
  const classes: string[] = [];

  for (const key of Reflect.ownKeys(resolvedModifiers)) {
    if (typeof key !== "string") continue;

    const className = `${componentName}--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    classes.push(className);
  }

  return classes.join(" ");
}
