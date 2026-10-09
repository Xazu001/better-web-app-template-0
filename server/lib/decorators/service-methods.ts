import { formError, getMessageFromResponse } from "$/lib/response";

import type { FormErrors } from "$/lib/response";

export function actionMethod(defaultError?: FormErrors) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>
  ) {
    const originalMethod = descriptor.value!;
    const defaultErr = defaultError ?? { general: "OPERATION_FAILED" as any };

    descriptor.value = async function (this: any, ...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (error && typeof error === "object" && "fields" in error) {
          return formError((error as { fields: FormErrors }).fields);
        }

        if (error instanceof Response) {
          const message = await getMessageFromResponse(error);
          return formError({ general: message as any });
        }

        console.error(`[actionMethod] ${propertyKey}:`, error);
        return formError(defaultErr as FormErrors);
      }
    };

    return descriptor;
  };
}

export function dataMethod() {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (error instanceof Response) {
          throw error;
        }

        if (error && typeof error === "object" && "fields" in error) {
          throw this.responses.getBadRequest(
            JSON.stringify((error as { fields: FormErrors }).fields)
          );
        }

        console.error(`[dataMethod] ${propertyKey}:`, error);
        throw this.responses.getInternalError();
      }
    };

    return descriptor;
  };
}
