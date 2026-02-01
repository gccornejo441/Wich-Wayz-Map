import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import {
  useForm,
  FormProvider,
  FieldValues,
  UseFormProps,
} from "react-hook-form";
import { BrowserRouter } from "react-router-dom";

interface RHFRenderOptions<T extends FieldValues = FieldValues> extends Omit<
  RenderOptions,
  "wrapper"
> {
  defaultValues?: Partial<T>;
  resolver?: UseFormProps<T>["resolver"];
}

export function renderWithRHF<T extends FieldValues = FieldValues>(
  ui: ReactElement,
  { defaultValues, resolver, ...renderOptions }: RHFRenderOptions<T> = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm<T>({
      defaultValues: defaultValues as UseFormProps<T>["defaultValues"],
      resolver,
      mode: "onChange",
    });

    return (
      <BrowserRouter>
        <FormProvider {...methods}>{children}</FormProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
