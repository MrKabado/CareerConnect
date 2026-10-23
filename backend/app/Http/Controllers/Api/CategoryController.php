<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function publicIndex(): JsonResponse
    {
        return response()->json([
            'data' => Category::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Category $category): array => [
                    'id' => $category->id,
                    'name' => $category->name,
                ]),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $categories = Category::query()
            ->when($request->boolean('activeOnly', false), fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $categories->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'is_active' => $category->is_active,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:categories,name'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $category = Category::create([
            'name' => trim($validated['name']),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Category created.',
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'is_active' => $category->is_active,
            ],
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100', Rule::unique('categories', 'name')->ignore($category->id)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $category->fill($validated);
        $category->save();

        return response()->json([
            'message' => 'Category updated.',
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'is_active' => $category->is_active,
            ],
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        if (Company::query()->where('category_id', $category->id)->exists()
            || $category->jobListings()->exists()
            || $category->applicantProfiles()->exists()) {
            return response()->json([
                'message' => 'This category is currently in use and cannot be deleted.',
                'code' => 'category_in_use',
            ], 409);
        }

        $category->delete();

        return response()->json([
            'message' => 'Category deleted.',
        ]);
    }
}
