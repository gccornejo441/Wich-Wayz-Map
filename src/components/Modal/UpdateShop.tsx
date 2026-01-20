import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Select from "react-select";
import { apiRequest } from "@services/apiClient";
import ModalWrapper from "./ModalWrapper";
import { updateShopSchema } from "@constants/validators";
import { UpdateShopPayload } from "../../types/dataTypes";
import { useModal } from "@context/modalContext";
import { useToast } from "@context/toastContext";
import { useUpdateShopCategories } from "@/services/updateLocationShop";
import { GetCategories } from "@/services/categoryService";
import { Category } from "@models/Category";

const UpdateShop = () => {
  const { currentModal, updateShopData, closeModal } = useModal();
  const { SaveUpdatedShopCategories } = useUpdateShopCategories();
  const { addToast } = useToast();
  const fallbackShopData: UpdateShopPayload = {
    name: "",
    description: "",
    categoryIds: [],
  };

  const shopData = updateShopData?.shopData || fallbackShopData;
  const shopId = updateShopData?.shopId || 0;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    shopData.categoryIds || [],
  );
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateShopPayload>({
    resolver: yupResolver(updateShopSchema),
    defaultValues: shopData,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await GetCategories();
      setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    Object.entries(shopData).forEach(([key, value]) => {
      setValue(
        key as keyof UpdateShopPayload,
        value as UpdateShopPayload[keyof UpdateShopPayload],
      );
    });

    setSelectedCategories(shopData.categoryIds || []);
  }, [shopData, setValue]);

  const onSubmit: SubmitHandler<UpdateShopPayload> = async (data) => {
    setIsSaving(true);
    try {
      await apiRequest(`/shops/${shopId}`, {
        method: "PATCH",
        body: JSON.stringify({
          shopName: data.name,
          shop_description: data.description || null,
          categoryIds: data.categoryIds || [],
        }),
      });

      const updatedCategories = data.categoryIds
        ?.map((id) => {
          const category = categories.find((cat) => cat.id === id);
          return category
            ? { id: category.id, category_name: category.category_name }
            : null;
        })
        .filter(Boolean);

      await SaveUpdatedShopCategories(
        shopId,
        updatedCategories as { id: number; category_name: string }[],
      );

      addToast("Shop updated successfully.", "success");
    } catch (error) {
      console.error("Failed to update shop:", error);
      addToast("Failed to update shop. Please try again.", "error");
    } finally {
      setIsSaving(false);
      closeModal();
    }
  };

  interface SelectOption {
    value: number;
    label: string;
  }

  const handleChange = (selectedOptions: SelectOption[]) => {
    const numericIds = selectedOptions.map((option) => option.value);
    setSelectedCategories(numericIds);
    setValue("categoryIds", numericIds);
  };

  if (currentModal !== "updateShop") return null;

  return (
    <ModalWrapper>
      <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-secondary">
          <h3 className="text-lg font-semibold text-dark">Update Shop</h3>
          <button
            onClick={closeModal}
            className="text-dark hover:bg-accent/10 rounded-lg text-sm w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-4 space-y-4 max-h-[75dvh] overflow-y-auto"
        >
          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Shop Name
            </label>
            <input
              type="text"
              {...register("name")}
              className={`w-full p-2 border rounded-lg bg-white text-dark ${errors.name ? "border-red-500" : "border-secondary"
                }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Shop Description
            </label>
            <input
              type="text"
              {...register("description")}
              className={`w-full p-2 border rounded-lg bg-white text-dark ${errors.description ? "border-red-500" : "border-secondary"
                }`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-dark">
              Categories
            </label>
            <Select
              isMulti
              options={
                categories.map((category) => ({
                  value: category.id,
                  label: category.category_name,
                })) as SelectOption[]
              }
              defaultValue={
                categories
                  .filter((category) =>
                    selectedCategories.includes(category.id as number),
                  )
                  .map((category) => ({
                    value: category.id,
                    label: category.category_name,
                  })) as SelectOption[]
              }
              onChange={(selected) => handleChange(selected as SelectOption[])}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          <button
            type="submit"
            className={`w-full px-4 py-2 rounded-lg text-white ${isSaving
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-secondary"
              }`}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </ModalWrapper>
  );
};

export default UpdateShop;
