import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export function handleApiError(error: unknown) {
  console.error("API_ERROR:", error);

  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Validation failed', details: error.flatten().fieldErrors }, { status: 400 });
  }

  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : (error instanceof Error ? error.message : String(error));
    
  return NextResponse.json({ error: message }, { status: 500 });
}

export function withValidation<T>(schema: ZodSchema<T>, handler: (data: T, req: Request) => Promise<NextResponse>) {
    return async (req: Request) => {
        try {
            const body = await req.json();
            const validatedData = schema.parse(body);
            return await handler(validatedData, req);
        } catch (error) {
            return handleApiError(error);
        }
    }
}
