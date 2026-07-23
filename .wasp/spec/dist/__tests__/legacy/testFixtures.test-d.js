import { describe, expectTypeOf, test } from "vitest";
describe("MinimalConfig<T>", () => {
    test("should not affect primitive types", async () => {
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
    });
    test("should not affect branded types", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("should convert no props object to EmptyObject", async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        expectTypeOf().toEqualTypeOf();
    });
    test("should remove optional props", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("should not affect required props", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("should recursively apply to nested objects", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("Should recursively apply to array items", async () => {
        expectTypeOf().toEqualTypeOf();
    });
});
describe("FullConfig<T>", () => {
    test("should not affect primitive types", async () => {
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
        expectTypeOf().toEqualTypeOf();
    });
    test("should not affect branded types", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("should not affect required props", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("should make optional props required", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("should recursively apply to nested objects", async () => {
        expectTypeOf().toEqualTypeOf();
    });
    test("Should recursively apply to array items", async () => {
        expectTypeOf().toEqualTypeOf();
    });
});
