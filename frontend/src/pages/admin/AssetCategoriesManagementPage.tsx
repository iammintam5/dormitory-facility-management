import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '../../lib/api-client';
import {
  createAssetCategory,
  deleteAssetCategory,
  getAssetCategories,
  updateAssetCategory,
  type AssetCategoryRecord,
} from '../../services/asset-categories';
import { useToast } from '../../toast/toast-context';

import { 
  Folder,
  Folders,
  Plus,
  PencilSimple,
  Trash,
  Spinner
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/Card';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';

const categorySchema = z.object({
  code: z.string().min(1, 'Nhập mã loại thiết bị.'),
  name: z.string().min(1, 'Nhập tên loại thiết bị.'),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;
type AssetCategoryView = {
  id: string;
  code: string;
  name: string;
  description: string;
  quantity: number;
};

export function AssetCategoriesManagementPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<AssetCategoryView[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategoryView | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories() {
    setIsLoading(true);
    try {
      const response = await getAssetCategories();
      setCategories(response.map(mapCategory));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không thể tải danh mục thiết bị.'), 'error');
    } finally {
      setIsLoading(false);
    }
  }

  const openAddModal = () => {
    setSelectedCategory(null);
    form.reset({
      code: '',
      name: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: AssetCategoryView) => {
    setSelectedCategory(cat);
    form.reset({
      code: cat.code,
      name: cat.name,
      description: cat.description,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CategoryFormValues) => {
    setIsLoading(true);
    try {
      if (selectedCategory) {
        await updateAssetCategory(selectedCategory.id, {
          code: data.code,
          name: data.name,
          description: data.description || null,
        });
        showToast('Cập nhật loại thiết bị thành công.', 'success');
      } else {
        await createAssetCategory({
          code: data.code,
          name: data.name,
          description: data.description || null,
        });
        showToast('Thêm loại thiết bị thành công.', 'success');
      }
      setIsModalOpen(false);
      await loadCategories();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Lưu thông tin thất bại.'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) => {
        const matchKeyword =
          !keyword ||
          `${category.code} ${category.name} ${category.description}`.toLowerCase().includes(keyword.toLowerCase());
        return matchKeyword;
      }),
    [categories, keyword],
  );

  const totalCategories = filteredCategories.length;
  const totalAssets = categories.reduce((sum, item) => sum + item.quantity, 0).toLocaleString('vi-VN');

  const handleDelete = async (id: string) => {
    try {
      await deleteAssetCategory(id);
      showToast('Xóa loại thiết bị thành công.', 'success');
      await loadCategories();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Xóa loại thiết bị thất bại.'), 'error');
    }
  };

  return (
    <div className="space-y-6 mx-auto max-w-7xl pb-10">
      <PageHeader 
        title="Loại thiết bị" 
        description="Quản lý danh mục và phân loại tài sản."
        actions={
          <Button onClick={openAddModal} className="gap-2">
            <Plus size={16} weight="bold" />
            Thêm loại thiết bị
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard 
          label="Tổng loại thiết bị" 
          value={String(totalCategories)} 
          unit="loại" 
          icon={<Folders size={24} weight="duotone" />} 
          colorClass="text-blue-600 bg-blue-50 border-blue-100" 
        />
        <SummaryCard 
          label="Thiết bị thuộc loại" 
          value={totalAssets} 
          unit="thiết bị" 
          icon={<Folder size={24} weight="duotone" />} 
          colorClass="text-purple-600 bg-purple-50 border-purple-100" 
        />
      </div>

      <Card className="border-border/50">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <div className="flex-1 w-full">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập tên loại thiết bị..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">STT</TableHead>
                <TableHead>Mã loại</TableHead>
                <TableHead>Tên loại thiết bị</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-center">Số lượng TB</TableHead>
                <TableHead className="w-24 text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Chưa có danh mục thiết bị.
                  </TableCell>
                </TableRow>
              ) : filteredCategories.map((cat, idx) => (
                <TableRow key={cat.id}>
                  <TableCell className="text-center font-medium text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-bold text-foreground">{cat.code}</TableCell>
                  <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                  <TableCell className="text-center tabular-nums font-medium">{cat.quantity}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(cat)}>
                        <PencilSimple size={16} className="text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void handleDelete(cat.id)}>
                        <Trash size={16} className="text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedCategory ? 'Cập nhật loại thiết bị' : 'Thêm loại thiết bị'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 animate-spin" />}
              Lưu
            </Button>
          </>
        }
      >
        <form id="category-form" className="space-y-4 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Mã loại <span className="text-destructive">*</span>
            </label>
            <Input 
              {...form.register('code')} 
              placeholder="VD: MAY_TINH" 
              error={!!form.formState.errors.code}
            />
            {form.formState.errors.code && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tên loại thiết bị <span className="text-destructive">*</span>
            </label>
            <Input 
              {...form.register('name')} 
              placeholder="VD: Máy tính bàn" 
              error={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mô tả</label>
            <textarea 
              {...form.register('description')} 
              placeholder="Nhập mô tả..." 
              rows={4} 
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

function mapCategory(category: AssetCategoryRecord): AssetCategoryView {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description ?? '',
    quantity: category._count?.assets ?? 0,
  };
}


